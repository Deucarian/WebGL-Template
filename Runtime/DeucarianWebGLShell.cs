using System;
using System.Runtime.InteropServices;
using UnityEngine;

namespace Deucarian.WebGLTemplate
{
    public enum DeucarianWebGLShellState
    {
        Loading,
        Ready,
        Failed,
        Disposed
    }

    public static class DeucarianWebGLShell
    {
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")]
        private static extern void DeucarianWebGLShellReportState(
            string json);

        [DllImport("__Internal")]
        private static extern void DeucarianWebGLShellReportProgress(
            string json);

        [DllImport("__Internal")]
        private static extern void DeucarianWebGLShellApplyTheme(
            string json);
#endif

        public static void ReportState(
            DeucarianWebGLShellState state,
            string message = null)
        {
            var snapshot = new LifecycleSnapshot
            {
                state = state.ToString().ToLowerInvariant(),
                message = message ?? string.Empty
            };
#if UNITY_WEBGL && !UNITY_EDITOR
            DeucarianWebGLShellReportState(JsonUtility.ToJson(snapshot));
#endif
        }

        public static void ReportProgress(
            string phase,
            float normalized,
            string displayText = null)
        {
            var snapshot = new ProgressSnapshot
            {
                phase = string.IsNullOrWhiteSpace(phase)
                    ? string.Empty
                    : phase.Trim(),
                normalizedProgress = Mathf.Clamp01(normalized),
                displayText = displayText ?? string.Empty
            };
#if UNITY_WEBGL && !UNITY_EDITOR
            DeucarianWebGLShellReportProgress(JsonUtility.ToJson(snapshot));
#endif
        }

        public static void ApplyThemeJson(string json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                throw new ArgumentException(
                    "A serialized theme snapshot is required.",
                    nameof(json));
            }
#if UNITY_WEBGL && !UNITY_EDITOR
            DeucarianWebGLShellApplyTheme(json);
#endif
        }

        [Serializable]
        private sealed class LifecycleSnapshot
        {
            public string state;
            public string message;
        }

        [Serializable]
        private sealed class ProgressSnapshot
        {
            public string phase;
            public float normalizedProgress;
            public string displayText;
        }
    }
}
