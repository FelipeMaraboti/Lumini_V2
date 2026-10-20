namespace Lumini.Application.Common.Interfaces;

/// <summary>
/// Proteção contra brute-force no login (janela deslizante por chave e-mail/IP).
/// </summary>
public interface ILoginRateLimiter
{
    bool IsBlocked(string key);
    void RecordFailure(string key);
    void Reset(string key);
}
