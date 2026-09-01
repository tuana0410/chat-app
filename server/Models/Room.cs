namespace server.Models;
public class Room
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsGroup { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}