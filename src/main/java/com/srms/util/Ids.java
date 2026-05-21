package com.srms.util;

import java.util.UUID;

/** Generates short opaque ids, e.g. "stu_a1b2c3d". */
public final class Ids {

    private Ids() {
    }

    public static String of(String prefix) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 7);
        return prefix + "_" + suffix;
    }
}
