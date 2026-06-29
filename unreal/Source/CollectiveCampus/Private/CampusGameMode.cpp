// Collective AI Inc. — Mega Campus

#include "CampusGameMode.h"

#include "CampusPlayerCharacter.h"
#include "CampusPlayerController.h"

ACampusGameMode::ACampusGameMode()
{
	DefaultPawnClass = ACampusPlayerCharacter::StaticClass();
	PlayerControllerClass = ACampusPlayerController::StaticClass();
}
