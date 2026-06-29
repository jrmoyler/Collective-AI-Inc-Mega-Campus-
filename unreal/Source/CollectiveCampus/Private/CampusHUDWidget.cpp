// Collective AI Inc. — Mega Campus

#include "CampusHUDWidget.h"

#include "CampusDistricts.h"
#include "Internationalization/Text.h"

void UCampusHUDWidget::SetSelectedFacility(const FFacilityRow& Facility, const FLinearColor& DistrictColor)
{
	CachedFacility = Facility;
	CachedDistrictColor = DistrictColor;
	bHasSelection = true;
	OnFacilitySelected(CachedFacility, CachedDistrictColor);
}

void UCampusHUDWidget::ClearSelection()
{
	bHasSelection = false;
	CachedFacility = FFacilityRow();
	CachedDistrictColor = FLinearColor::Gray;
	OnSelectionCleared();
}

FText UCampusHUDWidget::GetFacilityName() const
{
	return bHasSelection ? FText::FromString(CachedFacility.Name) : FText::GetEmpty();
}

FText UCampusHUDWidget::GetDistrictLabel() const
{
	if (!bHasSelection)
	{
		return FText::GetEmpty();
	}
	return UCampusDistricts::GetDistrictLabel(UCampusDistricts::DistrictFromKey(CachedFacility.District));
}

FText UCampusHUDWidget::GetAreaText() const
{
	if (!bHasSelection)
	{
		return FText::GetEmpty();
	}
	return FText::Format(
		NSLOCTEXT("Campus", "AreaFmt", "{0} sf"),
		FText::AsNumber(CachedFacility.AreaSquareFeet));
}

FText UCampusHUDWidget::GetHeightText() const
{
	if (!bHasSelection)
	{
		return FText::GetEmpty();
	}
	FNumberFormattingOptions Opts;
	Opts.MaximumFractionalDigits = 1;
	return FText::Format(
		NSLOCTEXT("Campus", "HeightFmt", "{0} m  ({1} stories)"),
		FText::AsNumber(CachedFacility.HeightMeters, &Opts),
		FText::AsNumber(CachedFacility.Stories));
}

FText UCampusHUDWidget::GetArchNotes() const
{
	return bHasSelection ? FText::FromString(CachedFacility.ArchNotes) : FText::GetEmpty();
}
