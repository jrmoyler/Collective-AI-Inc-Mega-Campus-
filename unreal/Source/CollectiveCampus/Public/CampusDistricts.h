// Collective AI Inc. — Mega Campus

#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "CampusTypes.h"
#include "CampusDistricts.generated.h"

/**
 * Static helpers that mirror DISTRICT_COLORS / DISTRICT_LABELS from viewer/lib/world.js,
 * resolving the raw district string key carried on FFacilityRow::District.
 */
UCLASS()
class COLLECTIVECAMPUS_API UCampusDistricts : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	/** Map a world.js district key (e.g. "utility_data") to the typed enum. */
	UFUNCTION(BlueprintPure, Category = "Campus|District")
	static ECampusDistrict DistrictFromKey(const FString& Key);

	/** Human-readable label, matching DISTRICT_LABELS. */
	UFUNCTION(BlueprintPure, Category = "Campus|District")
	static FText GetDistrictLabel(ECampusDistrict District);

	/** District accent colour, matching DISTRICT_COLORS hex values. */
	UFUNCTION(BlueprintPure, Category = "Campus|District")
	static FLinearColor GetDistrictColor(ECampusDistrict District);
};
