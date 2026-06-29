// Collective AI Inc. — Mega Campus

#include "CampusBuilding.h"

#include "CampusDistricts.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/WidgetComponent.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "UObject/ConstructorHelpers.h"

namespace
{
	// The engine basic cube is 100 cm on a side, pivoted at its centre. We scale that
	// 1 m unit cube by (footprint cm / 100) on X/Y and (height cm / 100) on Z.
	constexpr float UnitCubeSizeCm = 100.f;
}

ACampusBuilding::ACampusBuilding()
{
	PrimaryActorTick.bCanEverTick = false;

	SceneRoot = CreateDefaultSubobject<USceneComponent>(TEXT("SceneRoot"));
	SetRootComponent(SceneRoot);

	BuildingMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("BuildingMesh"));
	BuildingMesh->SetupAttachment(SceneRoot);
	BuildingMesh->SetCollisionProfileName(TEXT("BlockAll"));

	// Default to the engine's basic cube so the actor renders something out of the box.
	static ConstructorHelpers::FObjectFinder<UStaticMesh> CubeMeshFinder(
		TEXT("/Engine/BasicShapes/Cube.Cube"));
	if (CubeMeshFinder.Succeeded())
	{
		BuildingMesh->SetStaticMesh(CubeMeshFinder.Object);
	}

	InteractionSphere = CreateDefaultSubobject<USphereComponent>(TEXT("InteractionSphere"));
	InteractionSphere->SetupAttachment(SceneRoot);
	InteractionSphere->SetSphereRadius(600.f);
	InteractionSphere->SetCollisionProfileName(TEXT("OverlapAllDynamic"));

	LabelWidget = CreateDefaultSubobject<UWidgetComponent>(TEXT("LabelWidget"));
	LabelWidget->SetupAttachment(SceneRoot);
	LabelWidget->SetWidgetSpace(EWidgetSpace::Screen);
	LabelWidget->SetDrawAtDesiredSize(true);
}

void ACampusBuilding::ApplyFacilityData(const FFacilityRow& InFacility)
{
	Facility = InFacility;
	District = UCampusDistricts::DistrictFromKey(Facility.District);
	RebuildFromFacility();
}

FLinearColor ACampusBuilding::GetDistrictColor() const
{
	return UCampusDistricts::GetDistrictColor(District);
}

void ACampusBuilding::OnConstruction(const FTransform& Transform)
{
	Super::OnConstruction(Transform);

	// Keep the editor preview in sync when Facility is edited directly on a placed actor.
	District = UCampusDistricts::DistrictFromKey(Facility.District);
	RebuildFromFacility();
}

void ACampusBuilding::BeginPlay()
{
	Super::BeginPlay();
}

void ACampusBuilding::RebuildFromFacility()
{
	if (!BuildingMesh)
	{
		return;
	}

	// --- Footprint / height -> cube scale (meters -> cm via FCampusCoordinates) ---
	const float WidthCm  = FCampusCoordinates::ToCm(Facility.FootprintMeters.X);
	const float DepthCm  = FCampusCoordinates::ToCm(Facility.FootprintMeters.Y);
	const float HeightCm = FCampusCoordinates::ToCm(Facility.HeightMeters);

	const FVector MeshScale(
		FMath::Max(WidthCm, 1.f) / UnitCubeSizeCm,
		FMath::Max(DepthCm, 1.f) / UnitCubeSizeCm,
		FMath::Max(HeightCm, 1.f) / UnitCubeSizeCm);
	BuildingMesh->SetRelativeScale3D(MeshScale);

	// Cube pivot is centred, so lift it by half its height to seat the base on the ground.
	BuildingMesh->SetRelativeLocation(FVector(0.f, 0.f, HeightCm * 0.5f));

	// --- Interaction sphere covers the footprint plus a small margin ---
	const float HalfDiagonalCm = 0.5f * FMath::Sqrt(WidthCm * WidthCm + DepthCm * DepthCm);
	InteractionSphere->SetSphereRadius(FMath::Max(HalfDiagonalCm + 200.f, 300.f));

	// --- Floating label hovers just above the roof ---
	LabelWidget->SetRelativeLocation(FVector(0.f, 0.f, HeightCm + 200.f));

	// --- District tint on a dynamic material ---
	if (UMaterialInterface* BaseMaterial = BuildingMesh->GetMaterial(0))
	{
		if (!TintMID)
		{
			TintMID = UMaterialInstanceDynamic::Create(BaseMaterial, this);
			BuildingMesh->SetMaterial(0, TintMID);
		}
		// "Color" is the parameter on /Engine/BasicShapes/BasicShapeMaterial.
		TintMID->SetVectorParameterValue(TEXT("Color"), GetDistrictColor());
	}

#if WITH_EDITOR
	SetActorLabel(FString::Printf(TEXT("Bldg_%02d_%s"), Facility.Number, *Facility.FacilityId));
#endif
}
