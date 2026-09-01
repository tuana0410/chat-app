using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.DTOs;
using server.Models;

namespace server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FriendController : ControllerBase
{
    private readonly AppDbContext _context;

    public FriendController(AppDbContext context)
    {
        _context = context;
    }

    // ID/Etiket ile arkadaşlık isteği gönder
    [HttpPost("send-request")]
    public async Task<IActionResult> SendRequest([FromBody] SendFriendRequestDto dto)
    {
        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.UserTag == dto.TargetUserTag);
        if (targetUser == null)
            return NotFound("Bu ID'ye sahip kullanıcı bulunamadı.");

        if (targetUser.Id == dto.SenderId)
            return BadRequest("Kendinize istek gönderemezsiniz.");

        var existing = await _context.Friendships.FirstOrDefaultAsync(f =>
            (f.SenderId == dto.SenderId && f.ReceiverId == targetUser.Id) ||
            (f.SenderId == targetUser.Id && f.ReceiverId == dto.SenderId));

        if (existing != null)
            return BadRequest("Zaten bir istek var veya arkadaşsınız.");

        var request = new Friendship
        {
            SenderId = dto.SenderId,
            ReceiverId = targetUser.Id,
            Status = "Pending"
        };

        _context.Friendships.Add(request);
        await _context.SaveChangesAsync();

        return Ok("İstek başarıyla iletildi.");
    }

    // Gelen istekleri listele
    [HttpGet("pending-requests/{userId}")]
    public async Task<IActionResult> GetPendingRequests(int userId)
    {
        var requests = await _context.Friendships
            .Where(f => f.ReceiverId == userId && f.Status == "Pending")
            .Include(f => f.Sender)
            .Select(f => new
            {
                RequestId = f.Id,
                SenderId = f.SenderId,
                SenderUsername = f.Sender.Username,
                SenderTag = f.Sender.UserTag,
                CreatedAt = f.CreatedAt
            })
            .ToListAsync();

        return Ok(requests);
    }

    // İsteği kabul et veya reddet
    [HttpPost("respond-request")]
    public async Task<IActionResult> RespondRequest([FromBody] RespondFriendRequestDto dto)
    {
        var request = await _context.Friendships.FindAsync(dto.RequestId);
        if (request == null)
            return NotFound("İstek bulunamadı.");

        request.Status = dto.Accept ? "Accepted" : "Rejected";
        await _context.SaveChangesAsync();

        return Ok(dto.Accept ? "İstek kabul edildi." : "İstek reddedildi.");
    }

    // Onaylı arkadaşları (Rehberi) getir
    [HttpGet("contacts/{userId}")]
    public async Task<IActionResult> GetContacts(int userId)
    {
        var friendships = await _context.Friendships
            .Where(f => (f.SenderId == userId || f.ReceiverId == userId) && f.Status == "Accepted")
            .Include(f => f.Sender)
            .Include(f => f.Receiver)
            .ToListAsync();

        var contacts = friendships.Select(f =>
        {
            var friend = f.SenderId == userId ? f.Receiver : f.Sender;
            return new UserResponseDto
            {
                Id = friend.Id,
                Username = friend.Username,
                UserTag = friend.UserTag
            };
        }).ToList();

        return Ok(contacts);
    }
}