<?php

namespace App\Models;

use Database\Factories\CargoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'slug', 'author', 'description', 'source_type', 'cargofile', 'definition'])]
class Cargo extends Model
{
    /** @use HasFactory<CargoFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'definition' => 'array',
        ];
    }
}
