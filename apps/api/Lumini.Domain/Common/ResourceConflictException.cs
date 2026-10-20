namespace Lumini.Domain.Common;

/// <summary>
/// Conflito de concorrência otimista (RN-013). A versão persistida divergiu da esperada pelo cliente.
/// </summary>
public sealed class ResourceConflictException : Exception
{
    public uint CurrentVersion { get; }

    public ResourceConflictException(uint currentVersion)
        : base("O recurso foi alterado por outra operação. Recarregue e tente novamente.")
    {
        CurrentVersion = currentVersion;
    }
}
