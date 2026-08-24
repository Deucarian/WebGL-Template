using System.Collections.Generic;
using Deucarian.BuildPipeline;
using UnityEditor.Build.Profile;

namespace Deucarian.WebGLTemplate.Editor
{
    public static class DeucarianWebGLTemplate
    {
        public const string TemplateName = "DeucarianViewer";
        public const string PlayerSettingsValue = "PROJECT:" + TemplateName;
        public const string SourceRelativePath =
            "WebGLTemplates~/DeucarianViewer";

        private static readonly string[] RequiredFiles =
        {
            "TemplateData/style.css",
            "TemplateData/shell.js",
            "TemplateData/theme.js",
            "TemplateData/theme.generated.js"
        };

        public static string Synchronize()
        {
            return DeucarianWebGLTemplateUtility.SynchronizePackageTemplate(
                typeof(DeucarianWebGLTemplate).Assembly,
                SourceRelativePath,
                TemplateName);
        }

        public static void ApplyTo(BuildProfile profile)
        {
            DeucarianWebGLTemplateUtility.ApplyTemplate(
                profile,
                TemplateName);
        }

        public static DeucarianBuildValidationResult Validate(
            BuildProfile profile)
        {
            return DeucarianWebGLTemplateUtility.ValidateTemplate(
                profile,
                TemplateName,
                RequiredFiles);
        }

        public static IReadOnlyList<string> RequiredTemplateFiles =>
            RequiredFiles;
    }
}
