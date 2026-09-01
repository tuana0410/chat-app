namespace server.Models;

public class User 
{
    public int Id { get; set; }
    public string Username { get; set; }= string.Empty;
    public string UserTag { get; set; }= string.Empty;
    public string PasswordHash { get; set; }= string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Friendship> SentFriendships { get; set; } = new List<Friendship>();
    public ICollection<Friendship> ReceivedFriendships { get; set; } = new List<Friendship>();
    public ICollection<Room> Rooms { get; set; } = new List<Room>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}