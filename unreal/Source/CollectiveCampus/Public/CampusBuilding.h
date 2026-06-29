// Collective AI Inc. — Mega Campus

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "CampusTypes.h"
#include "CampusBuilding.generated.h"

class UStaticMeshComponent;
class USphereComponent;
class UWidgetComponent;
class UMaterialInstanceDynamic;

/**
 * A single, data-driven campus building.
 *
 * Built from an FFacilityRow: a placeholder cube mesh is non-uniformly scaled to the
 * facility footprint (width x depth) and height, positioned so its base sits on the ground
 * plane at the row's world position (meters -> cm via FCampusCoordinates). A WidgetComponent
 * renders a floating label, and a SphereComponent provides the interaction trigger that the
 * player character queries on IA_Interact. Swap the placeholder mesh for an imported GLB to
 * promote this from blockout to final art.
 */
UCLASS()
class COLLECTIVECAMPUS_API ACampusBuilding : public AActor
{
	GENERATED_BODY()

public:
	ACampusBuilding();

	/** Initialise geometry, label and collision from a facility row. Safe to call pre-BeginPlay. */
	UFUNCTION(BlueprintCallable, Category = "Campus|Building")
	void ApplyFacilityData(const FFacilityRow& InFacility);

	/** Read-only access to the data this building was built from. */
	UFUNCTION(BlueprintPure, Category = "Campus|Building")
	const FFacilityRow& GetFacility() const { return Facility; }

	/** Resolved district for this building. */
	UFUNCTION(BlueprintPure, Category = "Campus|Building")
	ECampusDistrict GetDistrict() const { return District; }

	/** District accent colour (mirrors world.js DISTRICT_COLORS). */
	UFUNCTION(BlueprintPure, Category = "Campus|Building")
	FLinearColor GetDistrictColor() const;

protected:
	virtual void OnConstruction(const FTransform& Transform) override;
	virtual void BeginPlay() override;

	/** Root; the building base sits at the actor origin on the ground plane. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	TObjectPtr<USceneComponent> SceneRoot;

	/** Placeholder blockout mesh (a 1x1x1 cube), scaled to the footprint and height. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	TObjectPtr<UStaticMeshComponent> BuildingMesh;

	/** Interaction trigger volume sized to the footprint. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	TObjectPtr<USphereComponent> InteractionSphere;

	/** Floating world-space label panel (UMG widget rendered in-world). */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Components")
	TObjectPtr<UWidgetComponent> LabelWidget;

	/** Source data for this building (mirrors one world.js FACILITIES entry). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Campus|Building", meta = (ShowOnlyInnerProperties))
	FFacilityRow Facility;

	/** Resolved district (from Facility.District). */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Campus|Building")
	ECampusDistrict District = ECampusDistrict::Unknown;

private:
	/** Apply scale/position/material tint from the current Facility values. */
	void RebuildFromFacility();

	/** Dynamic material so each building can be tinted by its district colour. */
	UPROPERTY(Transient)
	TObjectPtr<UMaterialInstanceDynamic> TintMID;
};
