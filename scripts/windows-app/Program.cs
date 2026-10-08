using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace MentionApp
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            // Default URL: can be overridden via command line or config file
            string targetUrl = "https://mention-inventaris.vercel.app";
            string configFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "mention-url.txt");
            
            if (File.Exists(configFile))
            {
                try
                {
                    string custom = File.ReadAllText(configFile).Trim();
                    if (!string.IsNullOrEmpty(custom)) targetUrl = custom;
                }
                catch { }
            }

            // Find Microsoft Edge or Google Chrome on Windows
            string edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Microsoft\Edge\Application\msedge.exe");
            if (!File.Exists(edgePath))
            {
                edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Microsoft\Edge\Application\msedge.exe");
            }

            string chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"Google\Chrome\Application\chrome.exe");
            if (!File.Exists(chromePath))
            {
                chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"Google\Chrome\Application\chrome.exe");
            }

            string browserExe = File.Exists(edgePath) ? edgePath : (File.Exists(chromePath) ? chromePath : null);

            if (browserExe != null)
            {
                // Launch in native Standalone App mode (no browser address bar, pure desktop window)
                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = browserExe,
                    Arguments = "--app=\"" + targetUrl + "\" --window-size=1280,820",
                    UseShellExecute = true
                };
                Process.Start(psi);
            }
            else
            {
                // Fallback to default browser
                Process.Start(new ProcessStartInfo
                {
                    FileName = targetUrl,
                    UseShellExecute = true
                });
            }
        }
    }
}
