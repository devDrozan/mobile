"""Read Expo update metadata from an AAB, without building/extracting it."""
import hashlib
import json
from pathlib import Path
import sys
import zipfile


def varint(data, index):
    value, shift = 0, 0
    while True:
        byte = data[index]
        index += 1
        value |= (byte & 127) << shift
        if byte < 128:
            return value, index
        shift += 7


def fields(data):
    index = 0
    while index < len(data):
        key, index = varint(data, index)
        wire, number = key & 7, key >> 3
        if wire == 2:
            length, index = varint(data, index)
            value = data[index:index + length]
            index += length
        elif wire == 0:
            value, index = varint(data, index)
        elif wire in (1, 5):
            size = 8 if wire == 1 else 4
            value = data[index:index + size]
            index += size
        else:
            raise ValueError('Unsupported protobuf wire type')
        yield number, value


def elements(node):
    # AAPT2 Resources.proto: XmlNode.element=1, XmlElement.name=3,
    # attribute=4, child=5; XmlAttribute.name=2, value=3.
    for number, value in fields(node):
        if number != 1 or not isinstance(value, bytes):
            continue
        values = list(fields(value))
        name = next((item.decode() for key, item in values if key == 3), '')
        attributes = {}
        for key, item in values:
            if key == 4:
                attribute = dict(fields(item))
                attributes[attribute.get(2, b'').decode()] = attribute.get(3, b'').decode()
        yield name, attributes
        for key, item in values:
            if key == 5:
                yield from elements(item)


path = Path(sys.argv[1])
with zipfile.ZipFile(path) as archive:
    nodes = list(elements(archive.read('base/manifest/AndroidManifest.xml')))
manifest = next(attributes for name, attributes in nodes if name == 'manifest')
metadata = {attributes['name']: attributes.get('value') for name, attributes in nodes
            if name == 'meta-data' and attributes.get('name', '').startswith('expo.modules.updates.')}
print(json.dumps({
    'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
    'versionName': manifest.get('versionName'), 'versionCode': manifest.get('versionCode'),
    'updateMetadata': metadata,
}, indent=2))
