<?php

namespace App\Models;

use Database\Factories\NodeCredentialFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NodeCredential extends Model
{
    /** @use HasFactory<NodeCredentialFactory> */
    use HasFactory;

    protected $fillable = [
        'node_id',
        'enrollment_token_hash',
        'enrollment_expires_at',
        'enrollment_used_at',
        'daemon_secret_hash',
        'daemon_secret_issued_at',
    ];

    protected function casts(): array
    {
        return [
            'enrollment_expires_at' => 'datetime',
            'enrollment_used_at' => 'datetime',
            'daemon_secret_issued_at' => 'datetime',
        ];
    }

    public function node(): BelongsTo
    {
        return $this->belongsTo(Node::class);
    }
}
