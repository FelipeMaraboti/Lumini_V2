namespace Lumini.Application.Catalog.DTOs;

public record MaterialResponse(
    Guid Id,
    string Name,
    string RockKind,
    decimal DensityKgPerM3,
    IReadOnlyList<decimal> ThicknessesMm,
    string ColorHex,
    string? TextureName,
    string Status,
    uint Version);

public record UpsertMaterialRequest(
    string Name,
    string RockKind,
    string DensityKgPerM3,
    IReadOnlyList<string> ThicknessesMm,
    string ColorHex,
    string? TextureName);

public record FinishResponse(
    Guid Id,
    string Code,
    string Name,
    string Description,
    string Profile,
    decimal MinSlabThicknessMm,
    bool IsSystem,
    string Status,
    uint Version);

public record UpsertFinishRequest(
    string Code,
    string Name,
    string Description,
    string Profile,
    string MinSlabThicknessMm);

public record UpdateFinishRequest(
    string Name,
    string Description,
    string MinSlabThicknessMm);

public record CompatibilityRequest(Guid FinishId, string ThicknessMm);

public record CompatibilityResponse(
    bool Compatible,
    decimal ThicknessMm,
    decimal MinSlabThicknessMm,
    string FinishCode,
    string FinishName,
    string Message);

public record PricingTableResponse(
    Guid Id,
    string Name,
    string Currency,
    bool IsDefault,
    uint Version,
    IReadOnlyList<PricingRuleResponse> Rules);

public record CreatePricingTableRequest(string Name);

public record CreatePricingRuleRequest(
    Guid? MaterialId,
    Guid? FinishTypeId,
    string Basis,
    string UnitPrice);

public record UpdatePricingRuleRequest(string UnitPrice);

public record PricingRuleResponse(
    Guid Id,
    Guid PricingTableId,
    Guid? MaterialId,
    Guid? FinishTypeId,
    string Basis,
    decimal UnitPrice,
    uint Version);
