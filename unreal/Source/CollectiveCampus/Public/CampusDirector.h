// Collective AI Inc. — Mega Campus

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "CampusDirector.generated.h"

class ACampusBuilding;
class UDataTable;

/**
 * Spawns the campus from data.
 *
 * On BeginPlay, iterates every row of the Facilities DataTable (FFacilityRow) and spawns one
 * ACampusBuilding per facility at the row's converted world position (meters -> cm). Place a
 * single ACampusDirector in the level; it owns the spawned buildings and can rebuild on demand.
 */
UCLASS()
class COLLECTIVECAMPUS_API ACampusDirector : public AActor
{
	GENERATED_BODY()

public:
	ACampusDirector();

	/** Destroy any spawned buildings and respawn from the current FacilitiesTable. */
	UFUNCTION(BlueprintCallable, CallInEditor, Category = "Campus")
	void RespawnCampus();

protected:
	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

	/** DataTable of FFacilityRow rows (imported from Content/Data/Facilities.csv). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Campus", meta = (RequiredAssetDataTags = "RowStructure=/Script/CollectiveCampus.FacilityRow"))
	TObjectPtr<UDataTable> FacilitiesTable;

	/** Building class to spawn (a Blueprint subclass of ACampusBuilding, or the C++ class). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Campus")
	TSubclassOf<ACampusBuilding> BuildingClass;

private:
	void SpawnCampus();
	void ClearSpawnedBuildings();

	/** Buildings spawned by this director (owned for lifetime management). */
	UPROPERTY(Transient)
	TArray<TObjectPtr<ACampusBuilding>> SpawnedBuildings;
};
