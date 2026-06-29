// Collective AI Inc. — Mega Campus

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "CampusPlayerController.generated.h"

class ACampusBuilding;
class UInputMappingContext;
class UCampusHUDWidget;

/**
 * Player controller for the walkthrough.
 *
 * Registers the pawn's Enhanced Input mapping context on possession, owns the on-screen
 * HUD widget, and routes building-selection events (raised by the character's interact
 * trace) into the HUD info panel.
 */
UCLASS()
class COLLECTIVECAMPUS_API ACampusPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	/** Called by the character when an interact trace hits a building. */
	void OnBuildingSelected(ACampusBuilding* Building);

protected:
	virtual void BeginPlay() override;
	virtual void OnPossess(APawn* InPawn) override;

	/** Priority for the pawn mapping context added on possession (0 = lowest). */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	int32 MappingContextPriority = 0;

	/** Fallback mapping context if the pawn doesn't supply one. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputMappingContext> FallbackMappingContext;

	/** HUD widget class (a Blueprint subclass of UCampusHUDWidget). */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "UI")
	TSubclassOf<UCampusHUDWidget> HUDWidgetClass;

private:
	void AddMappingContextForPawn(APawn* InPawn);

	UPROPERTY(Transient)
	TObjectPtr<UCampusHUDWidget> HUDWidget;
};
