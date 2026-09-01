using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.DTOs;
using server.Models;

namespace server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _context;

    public ChatController(AppDbContext context)
    {
        _context = context;
    }

    // Kullanıcının dahil olduğu tüm sohbetleri (birebir + gruplar) listele
    [HttpGet("user-rooms/{userId}")]
    public async Task<IActionResult> GetUserRooms(int userId)
    {
        var rooms = await _context.Rooms
            .Where(r => r.Users.Any(u => u.Id == userId))
            .Include(r => r.Users)
            .Include(r => r.Messages)
            .Select(r => new
            {
                RoomId = r.Id,
                RoomName = r.IsGroup 
                    ? r.Name 
                    : r.Users.FirstOrDefault(u => u.Id != userId)!.Username,
                IsGroup = r.IsGroup,
                LastMessage = r.Messages.OrderByDescending(m => m.SentAt).FirstOrDefault() != null 
                    ? r.Messages.OrderByDescending(m => m.SentAt).FirstOrDefault()!.Content 
                    : "Henüz mesaj yok"
            })
            .ToListAsync();

        return Ok(rooms);
    }

    // Birebir sohbet odası bul veya yoksa oluştur
    [HttpPost("get-or-create-private")]
    public async Task<IActionResult> GetOrCreatePrivateRoom([FromQuery] int userId1, [FromQuery] int userId2)
    {
        var room = await _context.Rooms
            .Include(r => r.Users)
            .FirstOrDefaultAsync(r => !r.IsGroup && 
                                      r.Users.Any(u => u.Id == userId1) && 
                                      r.Users.Any(u => u.Id == userId2));

        if (room == null)
        {
            var user1 = await _context.Users.FindAsync(userId1);
            var user2 = await _context.Users.FindAsync(userId2);

            if (user1 == null || user2 == null)
                return NotFound("Kullanıcılardan biri bulunamadı.");

            room = new Room
            {
                IsGroup = false,
                Users = new List<User> { user1, user2 }
            };

            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();
        }

        return Ok(new { RoomId = room.Id });
    }

    // Rehberdeki seçili kişilerden Grup Sohbeti oluştur
    [HttpPost("create-group")]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupDto dto)
    {
        if (dto.MemberUserIds.Count < 2)
            return BadRequest("Grup için en az 2 kişi seçilmelidir.");

        var users = await _context.Users
            .Where(u => dto.MemberUserIds.Contains(u.Id))
            .ToListAsync();

        var room = new Room
        {
            Name = dto.GroupName,
            IsGroup = true,
            Users = users
        };

        _context.Rooms.Add(room);
        await _context.SaveChangesAsync();

        return Ok(new { RoomId = room.Id, GroupName = room.Name });
    }

    // Bir odanın geçmiş mesajlarını getir
    [HttpGet("messages/{roomId}")]
    public async Task<IActionResult> GetRoomMessages(int roomId)
    {
        var messages = await _context.Messages
            .Where(m => m.RoomId == roomId)
            .Include(m => m.Sender)
            .OrderBy(m => m.SentAt)
            .Select(m => new
            {
                Id = m.Id,
                SenderId = m.SenderId,
                SenderUsername = m.Sender.Username,
                Content = m.Content,
                SentAt = m.SentAt
            })
            .ToListAsync();

        return Ok(messages);
    }
}