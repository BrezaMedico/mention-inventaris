import {
  getGenerations,
  getMembersByGeneration,
  getItems,
  getCheckers,
  verifyCheckerPin,
  createLoanTransaction,
  getActiveLoansByMember,
  processReturnTransaction,
  getDashboardStats,
  checkAndCreateWeeklyOverdueReminders,
} from '../lib/db/index.js';
import { verifyAdminCredentials } from '../lib/auth/session.js';

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE SYSTEM TESTS ---');

  // 1. Generations
  const generations = await getGenerations();
  console.log(`[TEST 1] Generations loaded: ${generations.length}`);
  if (generations.length < 5) throw new Error('Generations count mismatch');

  // 2. Members filtered by Generation
  const gen2 = generations.find((g) => g.name === 'Angkatan 2');
  if (!gen2) throw new Error('Angkatan 2 not found');
  const gen2Members = await getMembersByGeneration(gen2.id);
  console.log(`[TEST 2] Angkatan 2 members: ${gen2Members.map((m) => m.name).join(', ')}`);
  if (!gen2Members.some((m) => m.name.includes('Breza'))) throw new Error('Breza not in Angkatan 2');

  // 3. Items & Accessories
  const items = await getItems('AVAILABLE');
  console.log(`[TEST 3] Available items: ${items.length}`);
  if (items.length === 0) throw new Error('No available items');
  const firstItem = items[0];
  console.log(`First item: "${firstItem.name}", accessories: ${firstItem.accessories?.length}`);

  // 4. Checkers & 8-Digit PIN Verification
  const checkers = await getCheckers();
  console.log(`[TEST 4] Checkers: ${checkers.map((c) => c.name).join(', ')}`);
  const rian = checkers.find((c) => c.name.includes('Rian'));
  if (!rian) throw new Error('Checker Rian not found');

  // Test invalid pins
  const wrongPin = await verifyCheckerPin(rian.id, '00000000');
  console.log('[TEST 4a] Wrong PIN rejected:', !wrongPin.success);
  if (wrongPin.success) throw new Error('Wrong PIN should be rejected');

  const shortPin = await verifyCheckerPin(rian.id, '123');
  console.log('[TEST 4b] Short PIN rejected:', !shortPin.success);
  if (shortPin.success) throw new Error('Short PIN should be rejected');

  // Test valid PIN (12345678)
  const validPin = await verifyCheckerPin(rian.id, '12345678');
  console.log('[TEST 4c] Correct PIN (12345678) accepted:', validPin.success);
  if (!validPin.success) throw new Error('Correct PIN 12345678 failed to verify');

  // 5. Admin Authentication
  const adminAuth = await verifyAdminCredentials('mention', 'Mention_123!*');
  console.log('[TEST 5] Admin initial auth (mention / Mention_123!*):', adminAuth.success);
  if (!adminAuth.success) throw new Error('Admin authentication failed');

  const adminAuthFail = await verifyAdminCredentials('mention', 'wrong_pass');
  console.log('[TEST 5b] Admin wrong pass rejected:', !adminAuthFail.success);
  if (adminAuthFail.success) throw new Error('Wrong pass accepted');

  // 6. Borrow Transaction (Atomic & Race Condition Checked)
  const breza = gen2Members.find((m) => m.name.includes('Breza'));
  const cameraItem = items.find((i) => i.name.includes('Kamera'));
  const tripodItem = items.find((i) => i.name.includes('Tripod'));
  if (!breza || !cameraItem || !tripodItem) throw new Error('Test entities missing');

  const borrowResult = await createLoanTransaction({
    memberId: breza.id,
    borrowDate: '2026-09-20',
    expectedReturnDate: '2026-09-22',
    checkerId: rian.id,
    notes: 'Untuk dokumentasi MENTION',
    items: [
      {
        itemId: cameraItem.id,
        initialCondition: 'Aman',
        initialAccessories: ['Body Kamera', 'Lensa Kit 28-70mm', 'Baterai Original'],
        initialNotes: 'Mulus',
      },
      {
        itemId: tripodItem.id,
        initialCondition: 'Aman',
        initialAccessories: ['Tripod Legs', 'Ball Head'],
        initialNotes: 'Lengkap',
      },
    ],
  });

  console.log(`[TEST 6] Loan created: ${borrowResult.success}, code: ${borrowResult.loan?.loan_code}`);
  if (!borrowResult.success || !borrowResult.loan) throw new Error('Borrow creation failed');

  // 7. Verify items are now BORROWED and cannot be borrowed again (Race Condition Safety)
  const raceResult = await createLoanTransaction({
    memberId: breza.id,
    borrowDate: '2026-09-20',
    expectedReturnDate: '2026-09-22',
    checkerId: rian.id,
    items: [{ itemId: cameraItem.id, initialCondition: 'Aman', initialAccessories: [] }],
  });
  console.log('[TEST 7] Race condition safety (cannot double borrow):', !raceResult.success, `("${raceResult.error}")`);
  if (raceResult.success) throw new Error('Double borrow should be blocked!');

  // 8. Active Loans for Member
  const activeLoans = await getActiveLoansByMember(breza.id);
  console.log(`[TEST 8] Active loans for Breza: ${activeLoans.length}, items: ${activeLoans[0]?.items?.length}`);
  if (activeLoans.length === 0 || activeLoans[0].items?.length !== 2) throw new Error('Active loan items mismatch');

  // 9. Partial Return (Return only Camera first)
  const loanId = borrowResult.loan.id;
  const cameraLoanItem = activeLoans[0].items?.find((i) => i.item_id === cameraItem.id);
  if (!cameraLoanItem) throw new Error('Camera loan item not found');

  const returnResult = await processReturnTransaction({
    loanId,
    checkerId: rian.id,
    items: [
      {
        loanItemId: cameraLoanItem.id,
        returnCondition: 'Aman',
        returnAccessories: ['Body Kamera', 'Lensa Kit 28-70mm', 'Baterai Original'],
        returnNotes: 'Kembali dalam kondisi baik',
      },
    ],
  });

  console.log(`[TEST 9] Partial return: ${returnResult.success}, loan status: ${returnResult.loan?.status}`);
  if (returnResult.loan?.status !== 'PARTIALLY_RETURNED') {
    throw new Error(`Expected PARTIALLY_RETURNED, got ${returnResult.loan?.status}`);
  }

  // Camera should be AVAILABLE again
  const refreshedItems = await getItems('AVAILABLE');
  const cameraAvailableAgain = refreshedItems.some((i) => i.id === cameraItem.id);
  console.log('[TEST 9b] Camera returned to AVAILABLE:', cameraAvailableAgain);
  if (!cameraAvailableAgain) throw new Error('Camera should be available after return');

  // 10. Complete Return (Return Tripod)
  const activeLoansRemaining = await getActiveLoansByMember(breza.id);
  const tripodLoanItem = activeLoansRemaining[0].items?.find((i) => i.item_id === tripodItem.id);
  if (!tripodLoanItem) throw new Error('Tripod loan item not found');

  const fullReturnResult = await processReturnTransaction({
    loanId,
    checkerId: rian.id,
    items: [
      {
        loanItemId: tripodLoanItem.id,
        returnCondition: 'Aman',
        returnAccessories: ['Tripod Legs', 'Ball Head'],
        returnNotes: 'Lengkap',
      },
    ],
  });
  console.log(`[TEST 10] Full return: loan status is now: ${fullReturnResult.loan?.status}`);
  if (fullReturnResult.loan?.status !== 'RETURNED') {
    throw new Error(`Expected RETURNED, got ${fullReturnResult.loan?.status}`);
  }

  // 11. Overdue detection & Weekly reminder check
  const reminders = await checkAndCreateWeeklyOverdueReminders();
  console.log(`[TEST 11] Overdue check executed, new reminders: ${reminders.length}`);

  // 12. Dashboard Stats
  const stats = await getDashboardStats();
  console.log('[TEST 12] Dashboard Stats:', stats);

  console.log('--- ALL TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
