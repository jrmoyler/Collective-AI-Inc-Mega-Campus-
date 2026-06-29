// Collective AI Inc. — Mega Campus

#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "CampusTypes.generated.h"

/**
 * Campus districts. Mirrors DISTRICT_COLORS / DISTRICT_LABELS in viewer/lib/world.js.
 * The string keys in world.js map 1:1 to these enum values (see FFacilityRow::District,
 * which is imported from the CSV as the raw string key and resolved via UCampusDistricts).
 */
UENUM(BlueprintType)
enum class ECampusDistrict : uint8
{
	UtilityData                  UMETA(DisplayName = "Utility & Data"),
	GovernanceKnowledge          UMETA(DisplayName = "Governance & Knowledge"),
	PublicWellness               UMETA(DisplayName = "Public & Wellness"),
	ManufacturingLogistics       UMETA(DisplayName = "Manufacturing & Logistics"),
	BioenergyFarmLifescience     UMETA(DisplayName = "Bio-Energy & Life Science"),
	VisitorHotelMobilityResidential UMETA(DisplayName = "Visitor, Hotel & Mobility"),
	Unknown                      UMETA(DisplayName = "Unknown")
};

/**
 * One campus facility, mirroring a single entry of the FACILITIES array in
 * viewer/lib/world.js. This is the DataTable row struct backing Content/Data/Facilities.csv.
 *
 * UNITS / COORDINATES:
 *   The viewer world is Z-up, METERS, and (per world.js) the building "position" is the
 *   footprint CENTER [x, y] on the ground plane (z = 0). We store the SOURCE values here
 *   verbatim in METERS so the CSV stays a faithful mirror of world.js. The METERS->cm
 *   (×100) conversion and the meters->UE coordinate mapping happen in code at spawn time
 *   (see ACampusBuilding::ApplyFacilityData / FCampusCoordinates). Keeping meters in the
 *   row means a designer editing the table reasons in the same units as world.js.
 */
USTRUCT(BlueprintType)
struct FFacilityRow : public FTableRowBase
{
	GENERATED_BODY()

	/** Stable string id (matches world.js `id`), e.g. "prism_gateway_hq". */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Facility")
	FString FacilityId;

	/** Sequence number 1..30 (world.js `number`). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Facility")
	int32 Number = 0;

	/** Display name (world.js `name`). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Facility")
	FString Name;

	/** Raw district key from world.js (e.g. "utility_data"); resolve with UCampusDistricts. */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Facility")
	FString District;

	/** Footprint CENTER on the ground plane, in METERS (world.js `position` [x, y]). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Facility")
	FVector2D Position = FVector2D::ZeroVector;

	/** Building height in METERS (world.js `height_m`). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Facility")
	float HeightMeters = 0.f;

	/** Number of storeys (world.js `stories`). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Facility")
	int32 Stories = 0;

	/** Footprint extents [width_x, depth_y] in METERS (world.js `footprint_m`). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Facility")
	FVector2D FootprintMeters = FVector2D::ZeroVector;

	/** Gross floor area in square feet (world.js `area_sf`). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Facility")
	int32 AreaSquareFeet = 0;

	/** Architectural description (world.js `arch_notes`). */
	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Facility", meta = (MultiLine = true))
	FString ArchNotes;
};

/**
 * Coordinate conversion between the viewer world (Z-up, meters) and UE (Z-up, centimeters).
 *
 * world.js is right-handed-ish 2D top-down with Y as "depth"; UE is left-handed with +X
 * forward, +Y right, +Z up. We treat the viewer X->UE X and viewer Y->UE Y directly and
 * scale by 100 (1 m = 100 cm). This keeps the campus layout 1:1 with the viewer; if a
 * mirrored handedness is ever observed against imported art, negate Y here in ONE place.
 */
struct FCampusCoordinates
{
	/** Centimetres per metre. UE world unit is 1 cm. */
	static constexpr float MetersToCm = 100.f;

	/** Convert a viewer ground-plane position (meters) to a UE world location (cm). */
	static FORCEINLINE FVector GroundLocationFromMeters(const FVector2D& PositionMeters, float ZMeters = 0.f)
	{
		return FVector(PositionMeters.X * MetersToCm, PositionMeters.Y * MetersToCm, ZMeters * MetersToCm);
	}

	/** Convert a meters scalar to UE centimetres. */
	static FORCEINLINE float ToCm(float Meters)
	{
		return Meters * MetersToCm;
	}
};
