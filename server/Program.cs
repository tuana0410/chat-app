using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using server.Data;
using server.Hubs;

var builder = WebApplication.CreateBuilder(args);

// 1. Veritabanı Servisi (EF Core MSSQL)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. SignalR Servisi (Anlık mesajlaşma için)
builder.Services.AddSignalR();

// 3. MVC Servisleri (View ve Controller desteği)
builder.Services.AddControllersWithViews();

// 4. Oturum Yönetimi (Cookie Authentication)
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Auth/Login"; // Giriş yapmamış kullanıcı buraya yönlendirilir
        options.LogoutPath = "/Auth/Logout";
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
    });

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

// CSS, JS, Resimler (wwwroot klasörü) için statik dosya desteği
app.UseStaticFiles();

app.UseRouting();

// Kimlik doğrulama ve yetkilendirme sıralaması
app.UseAuthentication();
app.UseAuthorization();

// SignalR Hub rotası
app.MapHub<ChatHub>("/chathub");

// Varsayılan MVC rotası (Uygulama açılınca AuthController -> Login aksiyonuna gider)
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Auth}/{action=Login}/{id?}");

app.Run();