<?php

namespace App\Models;

use Database\Factories\CargoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[
    Fillable([
        'name',
        'slug',
        'author',
        'description',
        'features',
        'docker_images',
        'file_denylist',
        'file_hidden_list',
        'startup_command',
        'config_files',
        'config_startup',
        'config_logs',
        'config_stop',
        'install_script',
        'install_container',
        'install_entrypoint',
        'variables',
        'source_type',
        'cargofile',
        'definition',
    ]),
]
class Cargo extends Model
{
    /** @use HasFactory<CargoFactory> */
    use HasFactory;

    public function servers(): HasMany
    {
        return $this->hasMany(Server::class);
    }

    protected function casts(): array
    {
        return [
            'definition' => 'array',
            'features' => 'array',
            'docker_images' => 'array',
            'file_denylist' => 'array',
            'file_hidden_list' => 'array',
            'variables' => 'array',
        ];
    }
}
