// Collective AI Inc. — Mega Campus

#include "CampusDirector.h"

#include "CampusBuilding.h"
#include "CampusTypes.h"
#include "CollectiveCampus.h"
#include "Engine/DataTable.h"
#include "Engine/World.h"

ACampusDirector::ACampusDirector()
{
	PrimaryActorTick.bCanEverTick = false;
	BuildingClass = ACampusBuilding::StaticClass();
}

void ACampusDirector::BeginPlay()
{
	Super::BeginPlay();
	SpawnCampus();
}

void ACampusDirector::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	ClearSpawnedBuildings();
	Super::EndPlay(EndPlayReason);
}

void ACampusDirector::RespawnCampus()
{
	ClearSpawnedBuildings();
	SpawnCampus();
}

void ACampusDirector::SpawnCampus()
{
	if (!FacilitiesTable)
	{
		UE_LOG(LogCollectiveCampus, Warning, TEXT("ACampusDirector has no FacilitiesTable assigned."));
		return;
	}

	UWorld* World = GetWorld();
	if (!World || !*BuildingClass)
	{
		return;
	}

	const FString Context(TEXT("CampusDirector::SpawnCampus"));
	TArray<FFacilityRow*> Rows;
	FacilitiesTable->GetAllRows<FFacilityRow>(Context, Rows);

	int32 SpawnedCount = 0;
	for (const FFacilityRow* Row : Rows)
	{
		if (!Row)
		{
			continue;
		}

		// Convert the viewer ground position (meters) to a UE world location (cm).
		const FVector Location = FCampusCoordinates::GroundLocationFromMeters(Row->Position);

		FActorSpawnParameters SpawnParams;
		SpawnParams.Owner = this;
		SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

		ACampusBuilding* Building = World->SpawnActor<ACampusBuilding>(
			BuildingClass, Location, FRotator::ZeroRotator, SpawnParams);
		if (Building)
		{
			Building->ApplyFacilityData(*Row);
			SpawnedBuildings.Add(Building);
			++SpawnedCount;
		}
	}

	UE_LOG(LogCollectiveCampus, Log, TEXT("CampusDirector spawned %d / %d facilities."),
		SpawnedCount, Rows.Num());
}

void ACampusDirector::ClearSpawnedBuildings()
{
	for (ACampusBuilding* Building : SpawnedBuildings)
	{
		if (IsValid(Building))
		{
			Building->Destroy();
		}
	}
	SpawnedBuildings.Reset();
}
