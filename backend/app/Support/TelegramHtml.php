<?php

namespace App\Support;

/**
 * Convert Filament / TipTap HTML into Telegram Bot API HTML parse_mode.
 *
 * @see https://core.telegram.org/bots/api#html-style
 */
class TelegramHtml
{
    public static function fromRichHtml(?string $html): string
    {
        $html = trim((string) $html);
        if ($html === '' || $html === '<p></p>') {
            return '';
        }

        $html = preg_replace('/<\/p>\s*<p>/i', "</p>\n<p>", $html) ?? $html;
        $html = preg_replace('/<br\s*\/?>/i', "\n", $html) ?? $html;
        $html = preg_replace('/<\/(p|div|h[1-6]|li|blockquote)>/i', "$0\n", $html) ?? $html;
        $html = preg_replace('/<img\b[^>]*>/i', '', $html) ?? $html;

        $html = str_ireplace(
            ['<strong>', '</strong>', '<em>', '</em>', '<del>', '</del>', '<strike>', '</strike>'],
            ['<b>', '</b>', '<i>', '</i>', '<s>', '</s>', '<s>', '</s>'],
            $html
        );

        /** @var array<string, array{href: string, text: string}> $links */
        $links = [];
        $html = preg_replace_callback(
            '/<a\s+[^>]*href=(["\'])(.*?)\1[^>]*>(.*?)<\/a>/is',
            static function (array $m) use (&$links): string {
                $href = html_entity_decode($m[2], ENT_QUOTES | ENT_HTML5, 'UTF-8');
                if (! preg_match('#^https?://#i', $href)) {
                    return strip_tags($m[3]);
                }
                $token = '%%TG_LINK_'.count($links).'%%';
                $links[$token] = [
                    'href' => $href,
                    'text' => html_entity_decode(strip_tags($m[3]), ENT_QUOTES | ENT_HTML5, 'UTF-8'),
                ];

                return $token;
            },
            $html
        ) ?? $html;

        $html = strip_tags($html, '<b><i><u><s><code><pre>');

        $parts = preg_split('/(<\/?(?:b|i|u|s|code|pre)>)/i', $html, -1, PREG_SPLIT_DELIM_CAPTURE);
        if ($parts === false) {
            $parts = [$html];
        }

        $out = '';
        foreach ($parts as $part) {
            if (preg_match('/^<\/?(b|i|u|s|code|pre)>$/i', $part, $m)) {
                $name = strtolower($m[1]);
                $out .= str_starts_with($part, '</') ? "</{$name}>" : "<{$name}>";

                continue;
            }

            $text = html_entity_decode($part, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $out .= htmlspecialchars($text, ENT_NOQUOTES | ENT_HTML5, 'UTF-8');
        }

        foreach ($links as $token => $link) {
            $safeHref = htmlspecialchars($link['href'], ENT_QUOTES | ENT_HTML5, 'UTF-8');
            $safeText = htmlspecialchars($link['text'], ENT_NOQUOTES | ENT_HTML5, 'UTF-8');
            $out = str_replace($token, '<a href="'.$safeHref.'">'.$safeText.'</a>', $out);
        }

        $out = preg_replace("/[ \t]+\n/", "\n", $out) ?? $out;
        $out = preg_replace("/\n{3,}/", "\n\n", $out) ?? $out;

        return trim($out);
    }
}
