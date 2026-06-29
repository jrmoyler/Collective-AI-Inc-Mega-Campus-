// Collective AI Inc. — Mega Campus

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "CampusGameMode.generated.h"

/**
 * Game mode for the walkthrough. Wires the default pawn (ACampusPlayerCharacter) and
 * player controller (ACampusPlayerController) in its constructor. HUD is owned by the
 * controller, so AHUD is left at default.
 */
UCLASS()
class COLLECTIVECAMPUS_API ACampusGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	ACampusGameMode();
};
