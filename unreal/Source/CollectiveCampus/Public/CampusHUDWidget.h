// Collective AI Inc. — Mega Campus

#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "CampusTypes.h"
#include "CampusHUDWidget.generated.h"

/**
 * C++ base for the building-info HUD panel.
 *
 * The visual layout lives in a UMG Blueprint subclass (WBP_CampusHUD). This base owns the
 * data: SetSelectedFacility caches the selected row and fires BlueprintImplementableEvent
 * hooks so the designer-built widget can bind text blocks (name/district/area/height) and
 * the district accent colour without any further C++.
 */
UCLASS(Abstract)
class COLLECTIVECAMPUS_API UCampusHUDWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	/** Push a newly selected facility (and its district colour) to the panel. */
	UFUNCTION(BlueprintCallable, Category = "Campus|HUD")
	void SetSelectedFacility(const FFacilityRow& Facility, const FLinearColor& DistrictColor);

	/** Clear the panel (no building selected). */
	UFUNCTION(BlueprintCallable, Category = "Campus|HUD")
	void ClearSelection();

	//~ Convenience accessors for the Blueprint to bind text blocks against.
	UFUNCTION(BlueprintPure, Category = "Campus|HUD")
	FText GetFacilityName() const;

	UFUNCTION(BlueprintPure, Category = "Campus|HUD")
	FText GetDistrictLabel() const;

	UFUNCTION(BlueprintPure, Category = "Campus|HUD")
	FText GetAreaText() const;

	UFUNCTION(BlueprintPure, Category = "Campus|HUD")
	FText GetHeightText() const;

	UFUNCTION(BlueprintPure, Category = "Campus|HUD")
	FText GetArchNotes() const;

	UFUNCTION(BlueprintPure, Category = "Campus|HUD")
	FLinearColor GetDistrictColor() const { return CachedDistrictColor; }

protected:
	/** Implemented in the Blueprint: refresh visuals from the cached facility. */
	UFUNCTION(BlueprintImplementableEvent, Category = "Campus|HUD")
	void OnFacilitySelected(const FFacilityRow& Facility, const FLinearColor& DistrictColor);

	/** Implemented in the Blueprint: hide / reset the panel. */
	UFUNCTION(BlueprintImplementableEvent, Category = "Campus|HUD")
	void OnSelectionCleared();

	/** Currently displayed facility. */
	UPROPERTY(BlueprintReadOnly, Category = "Campus|HUD")
	FFacilityRow CachedFacility;

	/** Accent colour for the current district. */
	UPROPERTY(BlueprintReadOnly, Category = "Campus|HUD")
	FLinearColor CachedDistrictColor = FLinearColor::Gray;

	/** Whether a facility is currently selected. */
	UPROPERTY(BlueprintReadOnly, Category = "Campus|HUD")
	bool bHasSelection = false;
};
