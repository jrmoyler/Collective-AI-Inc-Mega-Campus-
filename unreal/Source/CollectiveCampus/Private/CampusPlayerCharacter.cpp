// Collective AI Inc. — Mega Campus

#include "CampusPlayerCharacter.h"

#include "CampusBuilding.h"
#include "CampusPlayerController.h"
#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "CollectiveCampus.h"

ACampusPlayerCharacter::ACampusPlayerCharacter()
{
	PrimaryActorTick.bCanEverTick = false;

	// Eye height ~1.7 m (world.js WORLD.eyeHeight) above the capsule centre.
	const float EyeHeightCm = 170.f - GetCapsuleComponent()->GetScaledCapsuleHalfHeight();

	FirstPersonCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FirstPersonCamera"));
	FirstPersonCamera->SetupAttachment(GetCapsuleComponent());
	FirstPersonCamera->SetRelativeLocation(FVector(0.f, 0.f, EyeHeightCm));
	FirstPersonCamera->bUsePawnControlRotation = true;

	SpringArm = CreateDefaultSubobject<USpringArmComponent>(TEXT("SpringArm"));
	SpringArm->SetupAttachment(GetCapsuleComponent());
	SpringArm->TargetArmLength = 350.f;
	SpringArm->SocketOffset = FVector(0.f, 0.f, 60.f);
	SpringArm->bUsePawnControlRotation = true;
	SpringArm->bEnableCameraLag = true;

	ThirdPersonCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("ThirdPersonCamera"));
	ThirdPersonCamera->SetupAttachment(SpringArm, USpringArmComponent::SocketName);
	ThirdPersonCamera->bUsePawnControlRotation = false;
	ThirdPersonCamera->SetActive(false);

	// Movement: rotate toward control yaw, free-walking pawn.
	bUseControllerRotationYaw = false;
	if (UCharacterMovementComponent* Move = GetCharacterMovement())
	{
		Move->bOrientRotationToMovement = false;
		Move->MaxWalkSpeed = WalkSpeed;
		Move->JumpZVelocity = 420.f;
		Move->AirControl = 0.2f;
	}
}

void ACampusPlayerCharacter::BeginPlay()
{
	Super::BeginPlay();
	UpdateCameraForView();

	if (UCharacterMovementComponent* Move = GetCharacterMovement())
	{
		Move->MaxWalkSpeed = WalkSpeed;
	}
}

void ACampusPlayerCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	if (!EIC)
	{
		UE_LOG(LogCollectiveCampus, Error,
			TEXT("CampusPlayerCharacter expects an EnhancedInputComponent; check DefaultInput.ini."));
		return;
	}

	if (MoveAction)
	{
		EIC->BindAction(MoveAction, ETriggerEvent::Triggered, this, &ACampusPlayerCharacter::Move);
	}
	if (LookAction)
	{
		EIC->BindAction(LookAction, ETriggerEvent::Triggered, this, &ACampusPlayerCharacter::Look);
	}
	if (JumpAction)
	{
		EIC->BindAction(JumpAction, ETriggerEvent::Started, this, &ACharacter::Jump);
		EIC->BindAction(JumpAction, ETriggerEvent::Completed, this, &ACharacter::StopJumping);
	}
	if (SprintAction)
	{
		EIC->BindAction(SprintAction, ETriggerEvent::Started, this, &ACampusPlayerCharacter::StartSprint);
		EIC->BindAction(SprintAction, ETriggerEvent::Completed, this, &ACampusPlayerCharacter::StopSprint);
	}
	if (InteractAction)
	{
		EIC->BindAction(InteractAction, ETriggerEvent::Started, this, &ACampusPlayerCharacter::Interact);
	}
	if (ToggleViewAction)
	{
		EIC->BindAction(ToggleViewAction, ETriggerEvent::Started, this, &ACampusPlayerCharacter::ToggleView);
	}
}

void ACampusPlayerCharacter::Move(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	if (Controller && !Axis.IsNearlyZero())
	{
		// Move relative to control yaw only, so look-pitch doesn't tilt walking.
		const FRotator YawRotation(0.f, Controller->GetControlRotation().Yaw, 0.f);
		const FVector Forward = FRotationMatrix(YawRotation).GetUnitAxis(EAxis::X);
		const FVector Right   = FRotationMatrix(YawRotation).GetUnitAxis(EAxis::Y);
		AddMovementInput(Forward, Axis.Y);
		AddMovementInput(Right, Axis.X);
	}
}

void ACampusPlayerCharacter::Look(const FInputActionValue& Value)
{
	const FVector2D Axis = Value.Get<FVector2D>();
	AddControllerYawInput(Axis.X);
	AddControllerPitchInput(Axis.Y);
}

void ACampusPlayerCharacter::StartSprint(const FInputActionValue& /*Value*/)
{
	if (UCharacterMovementComponent* Move = GetCharacterMovement())
	{
		Move->MaxWalkSpeed = SprintSpeed;
	}
}

void ACampusPlayerCharacter::StopSprint(const FInputActionValue& /*Value*/)
{
	if (UCharacterMovementComponent* Move = GetCharacterMovement())
	{
		Move->MaxWalkSpeed = WalkSpeed;
	}
}

void ACampusPlayerCharacter::Interact(const FInputActionValue& /*Value*/)
{
	// Camera-forward line trace; report the building hit to the controller for HUD display.
	const UCameraComponent* ActiveCamera = bThirdPersonView ? ThirdPersonCamera : FirstPersonCamera;
	if (!ActiveCamera)
	{
		return;
	}

	const FVector Start = ActiveCamera->GetComponentLocation();
	const FVector End = Start + ActiveCamera->GetForwardVector() * InteractTraceDistance;

	FHitResult Hit;
	FCollisionQueryParams Params(SCENE_QUERY_STAT(CampusInteract), false, this);
	if (GetWorld()->LineTraceSingleByChannel(Hit, Start, End, ECC_Visibility, Params))
	{
		if (ACampusBuilding* Building = Cast<ACampusBuilding>(Hit.GetActor()))
		{
			if (ACampusPlayerController* PC = Cast<ACampusPlayerController>(GetController()))
			{
				PC->OnBuildingSelected(Building);
			}
		}
	}
}

void ACampusPlayerCharacter::ToggleView(const FInputActionValue& /*Value*/)
{
	bThirdPersonView = !bThirdPersonView;
	UpdateCameraForView();
}

void ACampusPlayerCharacter::UpdateCameraForView()
{
	if (FirstPersonCamera)
	{
		FirstPersonCamera->SetActive(!bThirdPersonView);
	}
	if (ThirdPersonCamera)
	{
		ThirdPersonCamera->SetActive(bThirdPersonView);
	}
	// Hide the body in first-person so it never clips the camera.
	if (GetMesh())
	{
		GetMesh()->SetOwnerNoSee(!bThirdPersonView);
	}
}
