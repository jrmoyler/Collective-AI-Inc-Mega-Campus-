// Collective AI Inc. — Mega Campus

#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "CampusTypes.h"
#include "CampusFacilityDataAsset.generated.h"

class UStaticMesh;

/**
 * Editor-authored alternative to a Facilities.csv DataTable row.
 *
 * The DataTable (FFacilityRow) is the primary, designer-friendly path for bulk authoring
 * all 30 facilities from a spreadsheet. This UPrimaryDataAsset is the per-facility object
 * variant: use it when a single building needs editor-picked content (a real imported GLB
 * mesh, bespoke materials) layered on top of the shared row data. ACampusBuilding can be
 * initialised from either source.
 */
UCLASS(BlueprintType)
class COLLECTIVECAMPUS_API UCampusFacilityDataAsset : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	/** Shared facility metadata (units/coordinates documented on FFacilityRow). */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Facility", meta = (ShowOnlyInnerProperties))
	FFacilityRow Facility;

	/** Optional real mesh imported from /assets/glb/ via Interchange; soft so it streams. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Facility")
	TSoftObjectPtr<UStaticMesh> BuildingMesh;

	//~ Begin UPrimaryDataAsset
	virtual FPrimaryAssetId GetPrimaryAssetId() const override
	{
		return FPrimaryAssetId(TEXT("Facility"), GetFName());
	}
	//~ End UPrimaryDataAsset
};
