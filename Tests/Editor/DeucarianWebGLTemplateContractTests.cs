using System.IO;
using Deucarian.WebGLTemplate.Editor;
using NUnit.Framework;
using UnityEditor.PackageManager;

namespace Deucarian.WebGLTemplate.Tests
{
    public sealed class DeucarianWebGLTemplateContractTests
    {
        [Test]
        public void PackageContainsCompleteGenericTemplateSource()
        {
            PackageInfo package = PackageInfo.FindForAssembly(
                typeof(DeucarianWebGLTemplate).Assembly);
            Assert.That(package, Is.Not.Null);

            string root = Path.Combine(
                package.resolvedPath,
                DeucarianWebGLTemplate.SourceRelativePath);
            Assert.That(File.Exists(Path.Combine(root, "index.html")), Is.True);
            foreach (string relative in
                     DeucarianWebGLTemplate.RequiredTemplateFiles)
            {
                Assert.That(
                    File.Exists(Path.Combine(
                        root,
                        relative.Replace('/', Path.DirectorySeparatorChar))),
                    Is.True,
                    relative);
            }
        }

        [Test]
        public void BrowserContractIsProductNeutral()
        {
            PackageInfo package = PackageInfo.FindForAssembly(
                typeof(DeucarianWebGLTemplate).Assembly);
            string root = Path.Combine(
                package.resolvedPath,
                DeucarianWebGLTemplate.SourceRelativePath);
            string combined = File.ReadAllText(Path.Combine(root, "index.html"))
                              + File.ReadAllText(Path.Combine(
                                  root,
                                  "TemplateData",
                                  "shell.js"))
                              + File.ReadAllText(Path.Combine(
                                  root,
                                  "TemplateData",
                                  "theme.js"));

            Assert.That(combined, Does.Contain("{{{ PRODUCT_NAME }}}"));
            Assert.That(combined, Does.Contain("deucarian-viewer-state"));
            Assert.That(combined, Does.Contain("deucarian-command-event"));
            Assert.That(combined, Does.Not.Contain("Simultria Report Viewer"));
            Assert.That(combined, Does.Not.Contain("simultria-report-viewer"));
            Assert.That(combined, Does.Not.Contain("Loading reports"));
        }
    }
}
