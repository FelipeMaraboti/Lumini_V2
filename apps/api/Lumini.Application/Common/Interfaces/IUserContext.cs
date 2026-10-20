namespace Lumini.Application.Common.Interfaces;

public interface IUserContext
{
    Guid? UserId { get; }
    Guid RequiredUserId => UserId ?? throw new UnauthorizedAccessException("Usuário autenticado não resolvido.");
}
