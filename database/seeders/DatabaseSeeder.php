<?php

namespace Database\Seeders;

use App\Models\Allocation;
use App\Models\Cargo;
use App\Models\Location;
use App\Models\Node;
use App\Models\Server;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::factory()->create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'is_admin' => true,
        ]);

        $user = User::factory()->create([
            'name' => 'User',
            'email' => 'user@example.com',
        ]);

        $location = Location::factory()->create(['name' => 'Default']);

        $node = Node::factory()->create([
            'name' => 'Node 1',
            'fqdn' => 'localhost',
            'daemon_port' => 2800,
            'sftp_port' => 2022,
            'location_id' => $location->id,
            'use_ssl' => false,
        ]);

        $cargo = Cargo::factory()->create(['name' => 'Paper']);

        $allocation = Allocation::factory()->create([
            'node_id' => $node->id,
            'bind_ip' => '0.0.0.0',
            'port' => 25565,
        ]);

        // Create a few spare allocations for the user to add
        Allocation::factory()->count(5)->create([
            'node_id' => $node->id,
            'bind_ip' => '0.0.0.0',
        ]);

        Server::factory()->create([
            'name' => 'Test Server',
            'user_id' => $user->id,
            'node_id' => $node->id,
            'cargo_id' => $cargo->id,
            'allocation_id' => $allocation->id,
            'memory_mib' => 1024,
            'cpu_limit' => 100,
            'disk_mib' => 10240,
            'backup_limit' => 3,
            'status' => 'offline',
        ]);

        $allocation->update(['server_id' => 1]);
    }
}
