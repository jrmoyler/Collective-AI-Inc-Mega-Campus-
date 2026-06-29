// Collective AI Inc. — Mega Campus

#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"

DECLARE_LOG_CATEGORY_EXTERN(LogCollectiveCampus, Log, All);

/**
 * Primary runtime module for the Collective AI Mega Campus walkthrough.
 */
class FCollectiveCampusModule : public IModuleInterface
{
public:
	//~ Begin IModuleInterface
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
	//~ End IModuleInterface
};
