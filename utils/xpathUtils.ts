/**
 * Utility functions for XPath operations to persist text highlights
 */

// Generate XPath for a given node
export function getXPath(node: Node): string {
    if (node.nodeType === Node.DOCUMENT_NODE) {
        return '/';
    }

    const parent = node.parentNode;
    if (!parent) {
        return '';
    }

    const parentPath = getXPath(parent);

    // For text nodes, count preceding text node siblings
    if (node.nodeType === Node.TEXT_NODE) {
        const siblings = Array.from(parent.childNodes);
        // Filter for text nodes only to get the correct index among text nodes
        const textSiblings = siblings.filter(n => n.nodeType === Node.TEXT_NODE);
        const index = textSiblings.indexOf(node as ChildNode) + 1;
        return `${parentPath}/text()[${index}]`;
    }

    // For element nodes
    if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();
        // Count preceding siblings with same tag name
        const siblings = Array.from(parent.children).filter(
            e => e.tagName.toLowerCase() === tagName
        );
        const index = siblings.indexOf(element) + 1;
        return `${parentPath}/${tagName}[${index}]`;
    }

    return parentPath;
}

// Find node from XPath
export function getNodeFromXPath(xpath: string, root: Document | Element = document): Node | null {
    try {
        const result = document.evaluate(
            xpath,
            root instanceof Document ? root : root.ownerDocument || document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
        );
        return result.singleNodeValue;
    } catch (e) {
        console.error('Error evaluating XPath:', xpath, e);
        return null;
    }
}

// Serialize a Range object to persistable data
export function serializeRange(range: Range): {
    xpathStart: string;
    offsetStart: number;
    xpathEnd: string;
    offsetEnd: number;
} {
    return {
        xpathStart: getXPath(range.startContainer),
        offsetStart: range.startOffset,
        xpathEnd: getXPath(range.endContainer),
        offsetEnd: range.endOffset
    };
}

// Deserialize data back to a Range object
export function deserializeRange(data: {
    xpathStart: string;
    offsetStart: number;
    xpathEnd: string;
    offsetEnd: number;
}): Range | null {
    try {
        const startNode = getNodeFromXPath(data.xpathStart);
        const endNode = getNodeFromXPath(data.xpathEnd);

        if (!startNode || !endNode) {
            // console.warn('Could not find nodes for XPath:', data.xpathStart, data.xpathEnd);
            return null;
        }

        const range = document.createRange();
        range.setStart(startNode, data.offsetStart);
        range.setEnd(endNode, data.offsetEnd);
        return range;
    } catch (e) {
        console.error('Error deserializing range:', e);
        return null;
    }
}

// Fallback: Find range by text content (simple text match)
export function findRangeByText(text: string, root: Node): Range | null {
    if (!text || !root) return null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    let node: Node | null;
    while ((node = walker.nextNode())) {
        const content = node.textContent || '';
        const index = content.indexOf(text);
        if (index >= 0) {
            const range = document.createRange();
            range.setStart(node, index);
            range.setEnd(node, index + text.length);
            return range;
        }
    }
    return null;
}
