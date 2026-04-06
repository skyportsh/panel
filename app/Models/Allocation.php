<?php

namespace App\Models;

use Database\Factories\AllocationFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['node_id', 'bind_ip', 'port', 'ip_alias'])]
class Allocation extends Model
{
    /** @use HasFactory<AllocationFactory> */
    use HasFactory;

    public function node(): BelongsTo
    {
        return $this->belongsTo(Node::class);
    }

    public function server(): HasOne
    {
        return $this->hasOne(Server::class);
    }

    protected function casts(): array
    {
        return [
            'port' => 'integer',
        ];
    }
}
