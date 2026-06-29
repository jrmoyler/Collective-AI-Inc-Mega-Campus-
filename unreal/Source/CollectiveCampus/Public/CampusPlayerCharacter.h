// Collective AI Inc. — Mega Campus

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "CampusPlayerCharacter.generated.h"

class UCameraComponent;
class USpringArmComponent;
class UInputMappingContext;
class UInputAction;
struct FInputActionValue;

/**
 * Walkthrough pawn for the campus.
 *
 * A standard UCharacterMovementComponent walker driven entirely by Enhanced Input. Defaults
 * to a first-person view (camera at eye height) and toggles to a third-person spring-arm view
 * via IA_ToggleView. Sprinting scales max walk speed; IA_Interact line-traces for the building
 * the player is looking at and surfaces it to the controller/HUD.
 */
UCLASS()
class COLLECTIVECAMPUS_API ACampusPlayerCharacter : public ACharacter
{
	GENERATED_BODY()

public:
	ACampusPlayerCharacter();

	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

	/** Mapping context this pawn wants active; the PlayerController adds it on possession. */
	UFUNCTION(BlueprintPure, Category = "Input")
	UInputMappingContext* GetDefaultMappingContext() const { return DefaultMappingContext; }

protected:
	virtual void BeginPlay() override;

	//~ Input handlers
	void Move(const FInputActionValue& Value);
	void Look(const FInputActionValue& Value);
	void StartSprint(const FInputActionValue& Value);
	void StopSprint(const FInputActionValue& Value);
	void Interact(const FInputActionValue& Value);
	void ToggleView(const FInputActionValue& Value);

	/** First-person camera; active in FP mode, sits at eye height on the mesh/capsule. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
	TObjectPtr<UCameraComponent> FirstPersonCamera;

	/** Spring arm for the third-person view. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
	TObjectPtr<USpringArmComponent> SpringArm;

	/** Third-person camera mounted on the spring arm. */
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Camera")
	TObjectPtr<UCameraComponent> ThirdPersonCamera;

	//~ Enhanced Input assets (assigned on the Blueprint subclass / defaults)
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputMappingContext> DefaultMappingContext;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> MoveAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> LookAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> JumpAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> SprintAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> InteractAction;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Input")
	TObjectPtr<UInputAction> ToggleViewAction;

	/** Walk speed (cm/s) when not sprinting. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Movement")
	float WalkSpeed = 400.f;

	/** Walk speed (cm/s) while IA_Sprint is held. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Movement")
	float SprintSpeed = 900.f;

	/** Reach of the interaction line trace, in cm. */
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Interaction")
	float InteractTraceDistance = 800.f;

private:
	/** True when the third-person camera is active. */
	UPROPERTY(Transient)
	bool bThirdPersonView = false;

	void UpdateCameraForView();
};
