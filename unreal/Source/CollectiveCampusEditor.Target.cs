// Collective AI Inc. — Mega Campus

using UnrealBuildTool;
using System.Collections.Generic;

public class CollectiveCampusEditorTarget : TargetRules
{
	public CollectiveCampusEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.V5;
		IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_4;

		ExtraModuleNames.Add("CollectiveCampus");
	}
}
