using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.DTOs;
using server.Models;

namespace server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuthController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
            return BadRequest("Bu kullanıcı adı zaten alınmış.");

        // Rastgele 4 haneli benzersiz etiket üret (#kullanici1234)
        var randomTag = $"{dto.Username.ToLower()}_{new Random().Next(1000, 9999)}";

        var user = new User
        {
            Username = dto.Username,
            UserTag = randomTag,
            PasswordHash = dto.Password // Gerçek projelerde BCrypt ile hashlenir
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new UserResponseDto
        {
            Id = user.Id,
            Username = user.Username,
            UserTag = user.UserTag
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username && u.PasswordHash == dto.Password);
        
        if (user == null)
            return Unauthorized("Kullanıcı adı veya şifre hatalı.");

        return Ok(new UserResponseDto
        {
            Id = user.Id,
            Username = user.Username,
            UserTag = user.UserTag
        });
    }
}