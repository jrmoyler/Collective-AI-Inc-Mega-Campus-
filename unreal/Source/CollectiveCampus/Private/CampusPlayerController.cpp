// Collective AI Inc. — Mega Campus

#include "CampusPlayerController.h"

#include "CampusBuilding.h"
#include "CampusHUDWidget.h"
#include "CampusPlayerCharacter.h"
#include "CollectiveCampus.h"
#include "EnhancedInputSubsystems.h"
#include "InputMappingContext.h"

void ACampusPlayerController::BeginPlay()
{
	Super::BeginPlay();

	// Make sure a context is active even if OnPossess ran before BeginPlay set things up.
	AddMappingContextForPawn(GetPawn());

	if (HUDWidgetClass && IsLocalController())
	{
		HUDWidget = CreateWidget<UCampusHUDWidget>(this, HUDWidgetClass);
		if (HUDWidget)
		{
			HUDWidget->AddToViewport();
		}
	}
}

void ACampusPlayerController::OnPossess(APawn* InPawn)
{
	Super::OnPossess(InPawn);
	AddMappingContextForPawn(InPawn);
}

void ACampusPlayerController::AddMappingContextForPawn(APawn* InPawn)
{
	UEnhancedInputLocalPlayerSubsystem* Subsystem =
		ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(GetLocalPlayer());
	if (!Subsystem)
	{
		return;
	}

	UInputMappingContext* Context = FallbackMappingContext;
	if (const ACampusPlayerCharacter* Character = Cast<ACampusPlayerCharacter>(InPawn))
	{
		if (UInputMappingContext* PawnContext = Character->GetDefaultMappingContext())
		{
			Context = PawnContext;
		}
	}

	if (Context && !Subsystem->HasMappingContext(Context))
	{
		Subsystem->AddMappingContext(Context, MappingContextPriority);
	}
	else if (!Context)
	{
		UE_LOG(LogCollectiveCampus, Warning,
			TEXT("No InputMappingContext available; assign one on the pawn or controller defaults."));
	}
}

void ACampusPlayerController::OnBuildingSelected(ACampusBuilding* Building)
{
	if (!Building)
	{
		return;
	}

	UE_LOG(LogCollectiveCampus, Verbose, TEXT("Selected building: %s"), *Building->GetFacility().Name);

	if (HUDWidget)
	{
		HUDWidget->SetSelectedFacility(Building->GetFacility(), Building->GetDistrictColor());
	}
}
