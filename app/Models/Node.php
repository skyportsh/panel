<?php

namespace App\Models;

use Database\Factories\NodeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['name', 'location_id', 'fqdn', 'daemon_port', 'sftp_port', 'use_ssl'])]
class Node extends Model
{
    /** @use HasFactory<NodeFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'daemon_port' => 'integer',
            'sftp_port' => 'integer',
            'use_ssl' => 'boolean',
        ];
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }
}
