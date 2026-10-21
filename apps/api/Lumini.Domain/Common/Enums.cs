namespace Lumini.Domain.Common;

public enum UserStatus
{
    Active = 1,
    Pending = 2,
    Suspended = 3,
    Archived = 4
}

public enum OrganizationStatus
{
    Active = 1,
    Suspended = 2,
    Trial = 3,
    Archived = 4
}

public enum ClientStatus
{
    Active = 1,
    Archived = 2
}

public enum ProjectStatus
{
    Draft = 1,
    InReview = 2,
    Approved = 3,
    InProduction = 4,
    Completed = 5
}

public enum RevisionStatus
{
    Draft = 1,
    Approved = 2
}

public enum RockKind
{
    Marble = 1,
    Granite = 2,
    Quartzite = 3
}

public enum PriceBasis
{
    SquareMeter = 1,
    LinearMeter = 2,
    Unit = 3
}

public enum CatalogStatus
{
    Active = 1,
    Archived = 2
}
