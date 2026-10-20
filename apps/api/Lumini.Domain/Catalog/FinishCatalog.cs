namespace Lumini.Domain.Catalog;

/// <summary>
/// Acabamentos tradicionais de marmoraria e a espessura mínima de chapa (mm) que cada perfil exige.
/// </summary>
public sealed record FinishDefinition(
    string Code,
    string Name,
    string Description,
    string Profile,
    decimal MinSlabThicknessMm);

public static class FinishCatalog
{
    public static IReadOnlyList<FinishDefinition> Traditional { get; } =
    [
        new("rebaixo-italiano", "Rebaixo italiano", "Rasgo na face inferior para embutir a cuba, com a borda da pedra aparente.", "rebate-italian", 20m),
        new("rebaixo-americano", "Rebaixo americano", "Rasgo mais aberto na face inferior, deixando a borda da cuba aparente.", "rebate-american", 20m),
        new("meia-esquadria-45", "Meia-esquadria 45°", "Corte a 45° para encontro de topo, sem saia colada.", "miter-45", 20m),
        new("meia-esquadria-45-saia", "Meia-esquadria 45° com saia colada", "Corte a 45° com saia colada no encontro, aumentando a espessura visual da borda.", "miter-45-skirt", 20m),
        new("boleado", "Borda boleada", "Aresta superior arredondada, com raio parcial sobre a chapa.", "bullnose", 20m),
        new("meia-cana", "Meia-cana", "Aresta em meio círculo. O raio consome a espessura da chapa.", "half-bullnose", 30m),
        new("bisote-reto", "Bisotê reto", "Chanfro reto na aresta superior.", "bevel", 20m),
        new("polimento-simples", "Polimento simples", "Borda reta apenas polida, sem perfil especial.", "straight-polish", 12m),
        new("engrosso-saia", "Engrosso / saia colada", "Faixa de pedra colada na borda para engrossar a peça.", "laminated-skirt", 20m),
    ];
}
