namespace server.DTOs;

public class SendFriendRequestDto
{
    public int SenderId { get; set; }
    public string TargetUserTag { get; set; } = string.Empty; // Karşı tarafın #etiketi
}

public class RespondFriendRequestDto
{
    public int RequestId { get; set; }
    public bool Accept { get; set; } // true ise kabul, false ise red
}

public class CreateGroupDto
{
    public string GroupName { get; set; } = string.Empty;
    public List<int> MemberUserIds { get; set; } = new();
}
