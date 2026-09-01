using Microsoft.AspNetCore.SignalR;
namespace server.Hubs;

public class ChatHub : Hub
{
    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        
    }
    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
    }
    public async Task SendMessage(string roomId, string message,string username)
    {
        await Clients.Group(roomId).SendAsync("ReceiveMessage", new { RoomId = roomId, Sender = message, Content = username , SentAt = DateTime.UtcNow });
    }
    public async Task SendFriendNotification(string targetUserTag, string senderUsername)
    {
        await Clients.All.SendAsync("ReceiveFriendRequest",targetUserTag, senderUsername);
    }
}