using Lumini.Domain.Projects;
using Xunit;

namespace Lumini.UnitTests;

public class QuoteDraftTests
{
    [Fact]
    public void DraftKeepsTheCalculationSnapshotAndStaysUnapproved()
    {
        var quote = new Quote(
            Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
            Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            Guid.Parse("cccccccc-cccc-cccc-cccc-cccccccccccc"),
            2,
            Guid.Parse("dddddddd-dddd-dddd-dddd-dddddddddddd"),
            4,
            "brl",
            "idem-1",
            """{"grossAreaScenarioTotal":68.00}""");

        Assert.Equal(QuoteStatus.Draft, quote.Status);
        Assert.Equal("BRL", quote.Currency);
        Assert.Equal("""{"grossAreaScenarioTotal":68.00}""", quote.SnapshotJson);
        Assert.Equal(1u, quote.Version);
    }

    [Fact]
    public void RejectsADraftWithoutIdempotencyOrSnapshot()
    {
        Assert.Throws<ArgumentException>(() => new Quote(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, Guid.NewGuid(), 1, "BRL", " ", "{}"));
        Assert.Throws<ArgumentException>(() => new Quote(
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), 1, Guid.NewGuid(), 1, "BRL", "idem-1", "[]"));
    }
}
