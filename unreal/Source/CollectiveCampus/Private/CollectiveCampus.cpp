// Collective AI Inc. — Mega Campus

#include "CollectiveCampus.h"

DEFINE_LOG_CATEGORY(LogCollectiveCampus);

void FCollectiveCampusModule::StartupModule()
{
	UE_LOG(LogCollectiveCampus, Log, TEXT("CollectiveCampus module started."));
}

void FCollectiveCampusModule::ShutdownModule()
{
	UE_LOG(LogCollectiveCampus, Log, TEXT("CollectiveCampus module shut down."));
}

IMPLEMENT_PRIMARY_GAME_MODULE(FCollectiveCampusModule, CollectiveCampus, "CollectiveCampus");
