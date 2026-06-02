using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PadelBackend.Migrations
{
    public partial class MatchPlayerEloSnapshots : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "EloAfterMatch",
                table: "MatchPlayers",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EloBeforeMatch",
                table: "MatchPlayers",
                type: "integer",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EloAfterMatch",
                table: "MatchPlayers");

            migrationBuilder.DropColumn(
                name: "EloBeforeMatch",
                table: "MatchPlayers");
        }
    }
}
