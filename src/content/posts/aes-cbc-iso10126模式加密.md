---
title: aes-cbc-iso10126模式加密
published: 2025-12-09
description: ''
image: ''
tags: []
category: '加密'
draft: false 
lang: ''
---
<!--markdown-->
```python
#!/usr/bin/python3
# -*- coding: utf-8 -*-
"""
AES加密工具 - 将JavaScript AES加密转换为Python实现
"""

import json
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
import base64


def aes_encrypt_data(data, key_str="7bb3e153f59b11ef"):
    """
    使用AES CBC模式加密数据，模拟JavaScript的crypto-js库

    Args:
        data: 要加密的数据（字典或其他可JSON序列化的对象）
        key_str: 加密密钥字符串，默认为"7bb3e153f59b11ef"

    Returns:
        str: Base64编码的加密结果
    """
    try:
        # 1. 设置密钥和IV
        t = key_str
        # key: UTF8编码的密钥
        key = t.encode('utf-8')
        # iv: 反转密钥字符串后UTF8编码
        iv_str = t[::-1]  # 等同于 t.split("").reverse().join("")
        iv = iv_str.encode('utf-8')

        # 2. 将数据转换为JSON字符串
        json_data = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        plaintext = json_data.encode('utf-8')

        # 3. 使用PKCS7填充（ISO10126在Python中不常用，使用PKCS7替代）
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(plaintext)
        padded_data += padder.finalize()

        # 4. AES CBC加密
        cipher = Cipher(
            algorithms.AES(key),
            modes.CBC(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()

        # 5. Base64编码返回结果
        encrypted_base64 = base64.b64encode(ciphertext).decode('utf-8')

        return encrypted_base64

    except Exception as e:
        print(f"加密过程中出现错误: {e}")
        return None


def aes_encrypt_with_iso10126_padding(data, key_str="7bb3e153f59b11ef"):
    """
    使用AES CBC模式加密数据，尝试模拟ISO10126填充

    Args:
        data: 要加密的数据
        key_str: 加密密钥字符串

    Returns:
        str: Base64编码的加密结果
    """
    import os

    try:
        # 1. 设置密钥和IV
        t = key_str
        key = t.encode('utf-8')
        iv_str = t[::-1]
        iv = iv_str.encode('utf-8')

        # 2. 将数据转换为JSON字符串
        json_data = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
        plaintext = json_data.encode('utf-8')

        # 3. 手动实现类似ISO10126的填充
        block_size = 16  # AES块大小
        padding_length = block_size - (len(plaintext) % block_size)

        # ISO10126: 最后一个字节是填充长度，其他字节是随机数
        if padding_length == 0:
            padding_length = block_size

        random_bytes = os.urandom(padding_length - 1)
        padding_bytes = random_bytes + bytes([padding_length])
        padded_data = plaintext + padding_bytes

        # 4. AES CBC加密
        cipher = Cipher(
            algorithms.AES(key),
            modes.CBC(iv),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()

        # 5. Base64编码返回结果
        encrypted_base64 = base64.b64encode(ciphertext).decode('utf-8')

        return encrypted_base64

    except Exception as e:
        print(f"加密过程中出现错误: {e}")
        return None


def demo_usage():
    """
    演示如何使用加密函数
    """
    # 示例数据
    sample_data = {
        "username": "test_user",
        "password": "test_password",
        "timestamp": 1234567890,
        "action": "login"
    }
    # 使用类似ISO10126填充加密
    encrypted_iso = aes_encrypt_with_iso10126_padding(sample_data)
    print(encrypted_iso)

if __name__ == "__main__":
    demo_usage()
```
