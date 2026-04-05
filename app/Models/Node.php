<?php

namespace App\Models;

use Database\Factories\NodeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['name', 'location_id', 'fqdn', 'daemon_port', 'sftp_port', 'use_ssl'])]
class Node extends Model
{
    /** @use HasFactory<NodeFactory> */
    use HasFactory;

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function credential(): HasOne
    {
        return $this->hasOne(NodeCredential::class);
    }

    protected function casts(): array
    {
        return [
            'daemon_port' => 'integer',
            'sftp_port' => 'integer',
            'use_ssl' => 'boolean',
            'enrolled_at' => 'datetime',
            'last_seen_at' => 'datetime',
        ];
    }
}
