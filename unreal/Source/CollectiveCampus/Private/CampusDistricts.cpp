// Collective AI Inc. — Mega Campus

#include "CampusDistricts.h"

ECampusDistrict UCampusDistricts::DistrictFromKey(const FString& Key)
{
	if (Key == TEXT("utility_data"))                        { return ECampusDistrict::UtilityData; }
	if (Key == TEXT("governance_knowledge"))                { return ECampusDistrict::GovernanceKnowledge; }
	if (Key == TEXT("public_wellness"))                     { return ECampusDistrict::PublicWellness; }
	if (Key == TEXT("manufacturing_logistics"))             { return ECampusDistrict::ManufacturingLogistics; }
	if (Key == TEXT("bioenergy_farm_lifescience"))          { return ECampusDistrict::BioenergyFarmLifescience; }
	if (Key == TEXT("visitor_hotel_mobility_residential"))  { return ECampusDistrict::VisitorHotelMobilityResidential; }
	return ECampusDistrict::Unknown;
}

FText UCampusDistricts::GetDistrictLabel(ECampusDistrict District)
{
	switch (District)
	{
	case ECampusDistrict::UtilityData:                     return NSLOCTEXT("Campus", "District_UtilityData", "Utility & Data");
	case ECampusDistrict::GovernanceKnowledge:             return NSLOCTEXT("Campus", "District_Governance", "Governance & Knowledge");
	case ECampusDistrict::PublicWellness:                  return NSLOCTEXT("Campus", "District_Public", "Public & Wellness");
	case ECampusDistrict::ManufacturingLogistics:          return NSLOCTEXT("Campus", "District_Manufacturing", "Manufacturing & Logistics");
	case ECampusDistrict::BioenergyFarmLifescience:        return NSLOCTEXT("Campus", "District_Bioenergy", "Bio-Energy & Life Science");
	case ECampusDistrict::VisitorHotelMobilityResidential: return NSLOCTEXT("Campus", "District_Visitor", "Visitor, Hotel & Mobility");
	default:                                               return NSLOCTEXT("Campus", "District_Unknown", "Unknown");
	}
}

FLinearColor UCampusDistricts::GetDistrictColor(ECampusDistrict District)
{
	// Hex values mirror DISTRICT_COLORS in viewer/lib/world.js. FColor::FromHex converts
	// sRGB -> linear so the in-engine accent matches the viewer's CSS swatches.
	switch (District)
	{
	case ECampusDistrict::UtilityData:                     return FLinearColor::FromSRGBColor(FColor(0x4a, 0x90, 0xd9));
	case ECampusDistrict::GovernanceKnowledge:             return FLinearColor::FromSRGBColor(FColor(0x7b, 0x68, 0xee));
	case ECampusDistrict::PublicWellness:                  return FLinearColor::FromSRGBColor(FColor(0x3c, 0xb3, 0x71));
	case ECampusDistrict::ManufacturingLogistics:          return FLinearColor::FromSRGBColor(FColor(0xd4, 0x82, 0x2a));
	case ECampusDistrict::BioenergyFarmLifescience:        return FLinearColor::FromSRGBColor(FColor(0x32, 0xcd, 0x78));
	case ECampusDistrict::VisitorHotelMobilityResidential: return FLinearColor::FromSRGBColor(FColor(0xb8, 0x4d, 0xa0));
	default:                                               return FLinearColor::Gray;
	}
}
