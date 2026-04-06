<?php

namespace App\Models;

use Database\Factories\ServerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[
    Fillable([
        'user_id',
        'node_id',
        'cargo_id',
        'allocation_id',
        'name',
        'memory_mib',
        'cpu_limit',
        'disk_mib',
        'status',
        'last_error',
    ]),
]
class Server extends Model
{
    /** @use HasFactory<ServerFactory> */
    use HasFactory;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function node(): BelongsTo
    {
        return $this->belongsTo(Node::class);
    }

    public function cargo(): BelongsTo
    {
        return $this->belongsTo(Cargo::class);
    }

    public function allocation(): BelongsTo
    {
        return $this->belongsTo(Allocation::class);
    }

    protected function casts(): array
    {
        return [
            'memory_mib' => 'integer',
            'cpu_limit' => 'integer',
            'disk_mib' => 'integer',
        ];
    }
}
