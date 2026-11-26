"""Static accessibility checks (SI 5568 / WCAG 2.0) over every frontend page.

They catch markup regressions only. Colour contrast, keyboard behaviour and screen
reader output are not covered here.
"""
import re
from html.parser import HTMLParser
from pathlib import Path

import pytest

FRONTEND = Path(__file__).resolve().parents[2] / "frontend"
PAGES = sorted(FRONTEND.rglob("*.html"))
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}


class Node:
    def __init__(self, tag, attrs, parent):
        self.tag, self.attrs, self.parent, self.text = tag, attrs, parent, ""
        self.children = []

    def ancestors(self):
        node = self.parent
        while node:
            yield node
            node = node.parent


class Tree(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.root = self.current = Node("#root", {}, None)
        self.nodes = []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        node = Node(tag, {key: value or "" for key, value in attrs}, self.current)
        self.current.children.append(node)
        self.nodes.append(node)
        if tag not in VOID:
            self.current = node

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.current = self.current.parent

    def handle_endtag(self, tag):
        node = self.current
        while node.parent and node.tag != tag:
            node = node.parent
        if node.parent:
            self.current = node.parent

    def handle_data(self, data):
        self.current.text += data

    def all(self, *tags):
        return [node for node in self.nodes if node.tag in tags]


@pytest.fixture(params=PAGES, ids=lambda page: page.relative_to(FRONTEND).as_posix())
def page(request):
    return Tree(request.param.read_text(encoding="utf-8"))


def test_pages_were_found():
    assert len(PAGES) == 12


def test_language_and_title(page):
    assert page.all("html")[0].attrs.get("lang") in {"en", "he"}
    assert page.all("title")[0].text.strip()


def test_skip_link_targets_main(page):
    body = page.all("body")[0]
    first = body.children[0]
    assert (first.tag, first.attrs.get("href"), first.attrs.get("class")) == ("a", "#main", "skip-link")
    main = page.all("main")
    assert len(main) == 1 and main[0].attrs.get("id") == "main" and main[0].attrs.get("tabindex") == "-1"


def test_single_h1_and_no_skipped_levels(page):
    levels = [int(node.tag[1]) for node in page.all("h1", "h2", "h3", "h4", "h5", "h6")]
    assert levels.count(1) == 1
    previous = 0
    for level in levels:
        assert level <= previous + 1, f"heading levels {levels}"
        previous = level


def test_form_controls_have_names(page):
    labelled = {node.attrs.get("for") for node in page.all("label")}
    for control in page.all("input", "select", "textarea"):
        if control.attrs.get("type") in {"hidden", "submit", "button"}:
            continue
        named = (
            control.attrs.get("aria-label")
            or control.attrs.get("aria-labelledby")
            or control.attrs.get("id") in labelled - {None}
            or any(node.tag == "label" for node in control.ancestors())
        )
        assert named, f"unnamed {control.tag} {control.attrs}"


def test_labels_belong_to_a_control(page):
    for label in page.all("label"):
        wraps = any(child.tag in {"input", "select", "textarea"} for child in walk(label))
        assert wraps or label.attrs.get("for"), f"label without control: {label.attrs}"


def walk(node):
    for child in node.children:
        yield child
        yield from walk(child)


def test_buttons_and_links_have_text(page):
    for node in page.all("button", "a"):
        visible = [node, *(n for n in walk(node) if "material-symbols-outlined" not in n.attrs.get("class", "")
                           and n.attrs.get("aria-hidden") != "true")]
        text = "".join(n.text for n in visible).strip()
        alt = any(n.tag == "img" and n.attrs.get("alt") for n in walk(node))
        assert text or alt or node.attrs.get("aria-label"), f"{node.tag} without a name: {node.attrs}"


def test_icons_are_hidden(page):
    for node in page.nodes:
        if "material-symbols-outlined" in node.attrs.get("class", "") or node.tag == "svg":
            hidden = node.attrs.get("aria-hidden") == "true"
            named_image = node.attrs.get("role") == "img" and node.attrs.get("aria-label")
            assert hidden or named_image, f"exposed icon: {node.text.strip() or node.attrs}"


def test_images_have_alt(page):
    for image in page.all("img"):
        assert "alt" in image.attrs, image.attrs


def test_navigation_is_named(page):
    for nav in page.all("nav"):
        assert nav.attrs.get("aria-label"), nav.attrs


def test_table_headers_have_scope(page):
    for header in page.all("th"):
        assert header.attrs.get("scope") in {"col", "row"}, header.text


def test_ids_are_unique(page):
    ids = [node.attrs["id"] for node in page.nodes if "id" in node.attrs]
    assert len(ids) == len(set(ids)), sorted({i for i in ids if ids.count(i) > 1})


def test_footer_links_to_statement(page):
    links = [n for n in page.all("a") if re.fullmatch(r"(\.\./)?accessibility\.html", n.attrs.get("href", ""))]
    assert any(any(a.tag == "footer" for a in n.ancestors()) for n in links)


def test_focus_is_not_suppressed(page):
    for node in page.nodes:
        assert not re.search(r"(^|[\s:])outline-(none|hidden)\b", node.attrs.get("class", "")), node.attrs


def test_statement_covers_required_contents():
    source = (FRONTEND / "accessibility.html").read_text(encoding="utf-8")
    tree = Tree(source)
    assert tree.all("html")[0].attrs == {"lang": "he", "dir": "rtl"}
    for heading in ("מה הונגש", "שימוש במקלדת", "מה לא הונגש", "פנייה בנושא נגישות", "רכז נגישות", "תאריך עדכון"):
        assert any(heading in node.text for node in tree.all("h2")), heading
